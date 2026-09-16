import '@mantine/core';

declare module '@mantine/core' {
    interface MantineThemeOther {
        accentColor: string;
        amberAccent: string;
        navyBg: string;
        surfaceBg: string;
        surfaceInset: string;
        textPrimary: string;
        textSecondary: string;
    }
}
