import { Stack, Tabs } from "expo-router";

const stackScreenOptions = {
    headerShown: false
}

const tabsScreenOptions = {
    headerShown: false
}

export const ThemedStack = (props: any) => <Stack screenOptions={stackScreenOptions} {...props} />;
export const ThemedTabs  = (props: any) => <Tabs  screenOptions={tabsScreenOptions}  {...props} />;
