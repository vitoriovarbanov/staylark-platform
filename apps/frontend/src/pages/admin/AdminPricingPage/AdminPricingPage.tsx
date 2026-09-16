import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Stack, Tabs, Title } from '@mantine/core';
import { IconChartLine, IconBuildingSkyscraper, IconAdjustments } from '@tabler/icons-react';
import { ModelTab } from './components/ModelTab';
import { PropertiesTab } from './components/PropertiesTab';
import { OverridesTab } from './components/OverridesTab';

type TabValue = 'model' | 'properties' | 'overrides';

// Only managers reach this page, and pricing is entirely theirs — every tab is
// visible to every visitor. The Model tab is read-only metadata (how the model
// driving their quotes was trained); Properties and Overrides are scoped to the
// properties they manage.
const ALLOWED_TABS: TabValue[] = ['model', 'properties', 'overrides'];

export function AdminPricingPage() {
    const allowedTabs = useMemo(() => ALLOWED_TABS, []);
    const defaultTab: TabValue = 'overrides';

    const [searchParams, setSearchParams] = useSearchParams();
    const paramTab = searchParams.get('tab');
    const tab: TabValue = (allowedTabs as string[]).includes(paramTab ?? '') ? (paramTab as TabValue) : defaultTab;

    useEffect(() => {
        if (paramTab !== null && !(allowedTabs as string[]).includes(paramTab)) {
            const params = new URLSearchParams(searchParams);
            params.set('tab', defaultTab);
            setSearchParams(params, { replace: true });
        }
    }, [paramTab, allowedTabs, defaultTab, searchParams, setSearchParams]);

    const handleTabChange = useCallback(
        (next: string | null) => {
            if (next === null || !(allowedTabs as string[]).includes(next)) return;
            const params = new URLSearchParams(searchParams);
            params.set('tab', next);
            setSearchParams(params, { replace: true });
        },
        [allowedTabs, searchParams, setSearchParams]
    );

    return (
        <Stack gap='lg'>
            <Title order={2}>Pricing</Title>
            <Tabs value={tab} onChange={handleTabChange} keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab value='model' leftSection={<IconChartLine size={16} />}>
                        Model
                    </Tabs.Tab>
                    <Tabs.Tab value='properties' leftSection={<IconBuildingSkyscraper size={16} />}>
                        Properties
                    </Tabs.Tab>
                    <Tabs.Tab value='overrides' leftSection={<IconAdjustments size={16} />}>
                        Overrides
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value='model' pt='lg'>
                    <ModelTab />
                </Tabs.Panel>
                <Tabs.Panel value='properties' pt='lg'>
                    <PropertiesTab />
                </Tabs.Panel>
                <Tabs.Panel value='overrides' pt='lg'>
                    <OverridesTab />
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
