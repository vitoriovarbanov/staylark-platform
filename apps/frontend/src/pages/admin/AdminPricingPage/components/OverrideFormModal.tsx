import { useEffect } from 'react';
import { Button, NumberInput, Radio, Select, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { PricingRuleCreateSchema, type PricingRule, type PricingRuleCreate, type Property } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';

const FORM_ID = 'override-form';

interface OverrideFormModalProps {
    opened: boolean;
    override: PricingRule | null;
    properties: Property[];
    isSaving: boolean;
    isManager?: boolean;
    onClose: () => void;
    onSubmit: (values: PricingRuleCreate) => void;
}

type ScopeMode = 'property' | 'global';

type RuleType = 'SEASONAL' | 'DEMAND' | 'DURATION_DISCOUNT';

interface FormValues {
    name: string;
    type: RuleType;
    scope: ScopeMode;
    propertyId: string | null;
    dateRange: [Date | null, Date | null];
    adjustmentPercent: number;
    minNights: number | null;
}

const INITIAL_VALUES: FormValues = {
    name: '',
    type: 'SEASONAL',
    scope: 'property',
    propertyId: null,
    dateRange: [null, null],
    adjustmentPercent: 0,
    minNights: null
};

const TYPE_OPTIONS: { value: RuleType; label: string }[] = [
    { value: 'SEASONAL', label: 'Seasonal (e.g. Christmas week)' },
    { value: 'DEMAND', label: 'Demand (e.g. festival weekend)' },
    { value: 'DURATION_DISCOUNT', label: 'Duration discount (weekly / monthly)' }
];

const SOFT_WARN_MIN_PERCENT = -40;
const SOFT_WARN_MAX_PERCENT = 80;

function percentToMultiplier(percent: number): number {
    return 1 + percent / 100;
}

function multiplierToPercent(multiplier: number): number {
    return Math.round((multiplier - 1) * 100);
}

export function OverrideFormModal({
    opened,
    override,
    properties,
    isSaving,
    isManager = false,
    onClose,
    onSubmit
}: OverrideFormModalProps) {
    const isEdit = override !== null;

    const form = useForm<FormValues>({
        initialValues: INITIAL_VALUES,
        validate: {
            name: value => (value.trim().length === 0 ? 'Name is required' : null),
            propertyId: (value, values) => (values.scope === 'property' && !value ? 'Pick a property' : null),
            dateRange: value => (!value[0] || !value[1] ? 'Pick a start and end date' : null),
            adjustmentPercent: (value, values) => {
                const multiplier = percentToMultiplier(value);
                if (multiplier < 0.5 || multiplier > 2.0) {
                    return 'Adjustment must be between -50% and +100%';
                }
                if (values.type === 'DURATION_DISCOUNT' && value >= 0) {
                    return 'A duration discount must be negative (e.g. −10% for weekly, −20% for monthly)';
                }
                return null;
            },
            minNights: (value, values) => {
                if (values.type !== 'DURATION_DISCOUNT') return null;
                if (value == null) return 'Minimum nights is required for a duration discount';
                if (!Number.isInteger(value) || value < 2 || value > 365) {
                    return 'Minimum nights must be a whole number between 2 and 365';
                }
                return null;
            }
        }
    });

    useEffect(() => {
        if (!opened) return;
        if (override) {
            form.setValues({
                name: override.name,
                type: (override.type === 'DEMAND'
                    ? 'DEMAND'
                    : override.type === 'DURATION_DISCOUNT'
                      ? 'DURATION_DISCOUNT'
                      : 'SEASONAL') as RuleType,
                scope: override.propertyId === null ? 'global' : 'property',
                propertyId: override.propertyId,
                dateRange: [dayjs(override.startDate).toDate(), dayjs(override.endDate).toDate()],
                adjustmentPercent: multiplierToPercent(override.multiplier),
                minNights: override.minNights ?? null
            });
        } else {
            form.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, override]);

    const handleSubmit = form.onSubmit(values => {
        const [start, end] = values.dateRange;
        if (!start || !end) return;

        const payload: PricingRuleCreate = {
            propertyId: values.scope === 'global' ? null : values.propertyId,
            name: values.name.trim(),
            type: values.type,
            multiplier: percentToMultiplier(values.adjustmentPercent),
            startDate: dayjs(start).format('YYYY-MM-DD'),
            endDate: dayjs(end).format('YYYY-MM-DD'),
            isActive: true,
            minNights: values.type === 'DURATION_DISCOUNT' ? values.minNights : null
        };

        const parsed = PricingRuleCreateSchema.safeParse(payload);
        if (!parsed.success) {
            form.setErrors({ name: parsed.error.issues[0]?.message ?? 'Invalid input' });
            return;
        }

        onSubmit(parsed.data);
    });

    const percent = form.values.adjustmentPercent;
    const showSoftWarning = percent < SOFT_WARN_MIN_PERCENT || percent > SOFT_WARN_MAX_PERCENT;

    return (
        <BrandedModal
            opened={opened}
            onClose={onClose}
            eyebrow={`PRICING · ${isEdit ? 'EDIT RULE' : 'NEW RULE'}`}
            title={isEdit ? 'Edit override' : 'New override'}
            size='lg'
            footer={
                <>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type='submit' form={FORM_ID} loading={isSaving}>
                        {isEdit ? 'Update' : 'Create'}
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={handleSubmit}>
                <Stack>
                    <TextInput
                        label='Name'
                        placeholder='Christmas week uplift'
                        withAsterisk
                        {...form.getInputProps('name')}
                    />

                    <Select
                        label='Type'
                        data={TYPE_OPTIONS}
                        allowDeselect={false}
                        withAsterisk
                        {...form.getInputProps('type')}
                    />

                    {form.values.type === 'DURATION_DISCOUNT' && (
                        <NumberInput
                            label='Minimum nights'
                            description='Discount applies to the entire stay when it lasts at least this many nights. Higher tier wins — discounts never stack.'
                            placeholder='7'
                            min={2}
                            max={365}
                            step={1}
                            withAsterisk
                            {...form.getInputProps('minNights')}
                        />
                    )}

                    {!isManager && (
                        <Radio.Group
                            label='Scope'
                            withAsterisk
                            value={form.values.scope}
                            onChange={value => form.setFieldValue('scope', value as ScopeMode)}
                        >
                            <Stack mt='xs' gap='xs'>
                                <Radio value='property' label='Apply to one property' disabled={isEdit} />
                                <Radio value='global' label='Apply to all properties (global)' disabled={isEdit} />
                            </Stack>
                        </Radio.Group>
                    )}

                    {(isManager || form.values.scope === 'property') && (
                        <Select
                            label='Property'
                            placeholder='Select property'
                            data={properties.map(p => ({ value: p.id, label: `${p.title} — ${p.city}` }))}
                            searchable
                            withAsterisk
                            disabled={isEdit}
                            {...form.getInputProps('propertyId')}
                        />
                    )}

                    <DatePickerInput
                        type='range'
                        label='Dates'
                        placeholder='Pick start and end date'
                        valueFormat='D MMM YYYY'
                        withAsterisk
                        {...form.getInputProps('dateRange')}
                    />

                    {form.values.type === 'DURATION_DISCOUNT' && (
                        <Text size='xs' c='dimmed'>
                            For an always-on policy, pick a very wide range (e.g. 2026-01-01 → 2099-12-31). The rule
                            applies only when the entire stay falls within these dates.
                        </Text>
                    )}

                    <NumberInput
                        label='Adjustment (%)'
                        description='Positive for uplift, negative for discount. 0% means no change.'
                        suffix=' %'
                        step={5}
                        allowNegative
                        {...form.getInputProps('adjustmentPercent')}
                    />

                    {form.values.type === 'DURATION_DISCOUNT' && (
                        <Text size='xs' c='dimmed'>
                            Use a negative value for a discount (e.g. −10% for a weekly discount, −20% for monthly).
                        </Text>
                    )}

                    {showSoftWarning && (
                        <Text size='xs' c='yellow.7'>
                            Values outside the engine cap will be clamped at quote time.
                        </Text>
                    )}
                </Stack>
            </form>
        </BrandedModal>
    );
}
