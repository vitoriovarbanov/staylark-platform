import type { FeedbackSentiment } from '@prisma/client';
import { inferenceClient, isInferenceMocked } from '../../../utils/inference.js';
import { feedbackRepository } from '../repository/feedback.repository.js';
import { logger } from '../../../utils/logger.js';

/**
 * Backfill / retry-net for the inference analysis. Tagging + classification happen
 * synchronously at submission, but a transient inference outage can leave a row without
 * sentiment or topics. These passes re-run analysis over affected rows — handy as a
 * one-off (re-tag historical rows) and as an optional scheduled safety net.
 */
export const feedbackBackfillService = {
    /** Retry classification for rows that failed at submission (transcript present, sentiment null). */
    backfillClassification: async () => {
        if (isInferenceMocked) return { backfilled: 0 };
        const rows = await feedbackRepository.findUnclassified();
        let backfilled = 0;
        for (const r of rows) {
            try {
                const c = await inferenceClient.classify(r.text);
                await feedbackRepository.setClassification(r.id, c.sentiment as FeedbackSentiment, c.score);
                backfilled++;
            } catch (err) {
                logger.warn({ err, id: r.id }, 'Backfill classification failed; will retry next run');
            }
        }
        return { backfilled };
    },

    /** Re-tag aspects (zero-shot) for every review with a transcript, overwriting stale topics. */
    backfillTopics: async () => {
        if (isInferenceMocked) {
            logger.info('Inference mocked — skipping topic backfill');
            return { tagged: 0 };
        }
        const rows = await feedbackRepository.findAllForTopics();
        let tagged = 0;
        for (const r of rows) {
            try {
                const { topics } = await inferenceClient.tagAspects(r.text);
                await feedbackRepository.setTopics(r.id, topics.length > 0 ? topics : null);
                tagged++;
            } catch (err) {
                logger.warn({ err, id: r.id }, 'Backfill aspect tagging failed; will retry next run');
            }
        }
        logger.info({ tagged }, 'Aspect backfill complete');
        return { tagged };
    }
};
