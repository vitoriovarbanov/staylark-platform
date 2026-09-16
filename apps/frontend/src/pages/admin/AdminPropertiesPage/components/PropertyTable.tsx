import { Paper, Badge, Button, Group, ActionIcon, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconBuildingOff, IconEdit, IconTrash, IconUserShare } from '@tabler/icons-react';
import type { Property } from '@staylark/contract';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { EmptyState } from '@/components/EmptyState/EmptyState';

interface PropertyTableProps {
    properties: Property[];
    isLoading: boolean;
    deletingId: string | null;
    onEdit: (property: Property) => void;
    onDelete: (id: string) => void;
    onTransfer: (property: Property) => void;
    onClaim: (id: string) => void;
    claimingId: string | null;
    /** The signed-in manager's id — decides which rows are theirs to act on. */
    viewerId: string | undefined;
    /** Whether the viewer can manage properties at all. Only managers reach this page. */
    canManage: boolean;
}

export function PropertyTable({
    properties,
    isLoading,
    deletingId,
    onEdit,
    onDelete,
    onTransfer,
    onClaim,
    claimingId,
    viewerId,
    canManage
}: PropertyTableProps) {
    const confirmDelete = (property: Property) => {
        modals.openConfirmModal({
            title: 'Delete property',
            children: (
                <Text size='sm'>
                    Are you sure you want to delete <strong>{property.title}</strong>? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => onDelete(property.id)
        });
    };

    const columns: ColumnDef<Property>[] = [
        { key: 'title', header: 'Title', render: p => p.title },
        { key: 'city', header: 'City', render: p => p.city },
        { key: 'type', header: 'Type', render: p => <Badge variant='light'>{p.type}</Badge> },
        { key: 'price', header: 'Price/Night', mono: true, render: p => `${p.nightlyPrice}€` },
        { key: 'photos', header: 'Photos', mono: true, render: p => p.photos.length },
        // Legacy rows with no manager. Nothing in the current flows can create one —
        // removing a manager always names a successor — but pre-existing orphans
        // need a way back into someone's portfolio.
        {
            key: 'owner',
            header: 'Owner',
            render: p =>
                p.managerId ? (
                    <Badge variant='light' color={p.managerId === viewerId ? 'teal' : 'gray'}>
                        {p.managerId === viewerId ? 'You' : 'Another manager'}
                    </Badge>
                ) : (
                    <Badge variant='light' color='orange'>
                        Unassigned
                    </Badge>
                )
        },
        ...(canManage
            ? [
                  {
                      key: 'actions',
                      header: 'Actions',
                      render: (p: Property) => {
                          if (!p.managerId) {
                              return (
                                  <Button
                                      size='xs'
                                      variant='light'
                                      loading={claimingId === p.id}
                                      disabled={claimingId !== null}
                                      onClick={() => onClaim(p.id)}
                                  >
                                      Claim
                                  </Button>
                              );
                          }
                          // Only the owning manager may act; other managers' rows are read-only.
                          if (p.managerId !== viewerId) return null;
                          return (
                              <Group gap='xs'>
                                  <ActionIcon variant='subtle' onClick={() => onEdit(p)} aria-label={`Edit ${p.title}`}>
                                      <IconEdit size={16} />
                                  </ActionIcon>
                                  <Tooltip label='Change manager'>
                                      <ActionIcon
                                          variant='subtle'
                                          onClick={() => onTransfer(p)}
                                          aria-label={`Change manager for ${p.title}`}
                                      >
                                          <IconUserShare size={16} />
                                      </ActionIcon>
                                  </Tooltip>
                                  <ActionIcon
                                      variant='subtle'
                                      color='red'
                                      loading={deletingId === p.id}
                                      disabled={deletingId !== null}
                                      onClick={() => confirmDelete(p)}
                                      aria-label={`Delete ${p.title}`}
                                  >
                                      <IconTrash size={16} />
                                  </ActionIcon>
                              </Group>
                          );
                      }
                  } satisfies ColumnDef<Property>
              ]
            : [])
    ];

    return (
        <Paper withBorder>
            <DataTable<Property>
                data={properties}
                columns={columns}
                isLoading={isLoading}
                getRowKey={p => p.id}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconBuildingOff}
                        title='No properties yet'
                        body='Create your first property to start accepting bookings.'
                    />
                }
                minWidth={800}
            />
        </Paper>
    );
}
