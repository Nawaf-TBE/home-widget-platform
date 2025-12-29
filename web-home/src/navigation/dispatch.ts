import { parseDeeplink } from './deeplink';

export function dispatchDeeplink(
    deeplink: string,
    navigate: (path: string) => void,
    notify: (msg: string) => void
) {
    const destination = parseDeeplink(deeplink);
    console.log("[SDUI] dispatchDeeplink", { deeplink, parsed: destination });

    switch (destination) {
        case 'saved':
            console.log("[SDUI] navigating", { to: '/saved' });
            navigate('/saved');
            return;
        case 'tariffs':
            console.log("[SDUI] navigating", { to: '/tariffs' });
            navigate('/tariffs');
            return;
        case 'unknown':
        default:
            console.warn("[SDUI] unknown deeplink", deeplink);
            notify(`Unsupported action: ${deeplink}`);
            return;
    }
}
