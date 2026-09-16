import { Stepper } from '@mantine/core';
import type { TicketStatus } from '@staylark/contract';

interface StatusStepperProps {
    status: TicketStatus;
}

const STEP_INDEX: Record<TicketStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 1,
    RESOLVED: 2,
    // DISMISSED is off the linear track — the modal renders a banner instead of this stepper.
    DISMISSED: -1
};

export function StatusStepper({ status }: StatusStepperProps) {
    const active = STEP_INDEX[status];
    return (
        <Stepper active={active} size='sm' allowNextStepsSelect={false} aria-label='Ticket status progress'>
            <Stepper.Step label='Open' description='Awaiting triage' />
            <Stepper.Step label='In progress' description='Being worked on' />
            <Stepper.Step label='Resolved' description='Closed out' />
        </Stepper>
    );
}
