// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// jsdom lacks these web APIs, which the Anthropic SDK touches at import time.
// (Browsers and Android WebView have them natively.)
Object.assign(global, { TextEncoder, TextDecoder });
if (!global.ReadableStream) global.ReadableStream = ReadableStream;
