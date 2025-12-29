import { parseDeeplink } from './navigation';

const testCases = [
    'app://me/saved',
    'app://tariffs',
    'app://tariff/123',
    'app://category/electronics',
    'app://deals/xyz',
    'app://unknown/path'
];

testCases.forEach(link => {
    console.log(`"${link}" -> "${parseDeeplink(link)}"`);
});
