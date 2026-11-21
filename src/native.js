// Native (Android) integration via Capacitor. Everything here is a no-op in a normal browser.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAudioContext } from './audio/synth';

export const isNative = Capacitor.isNativePlatform();

/** Fired when the app goes to the background — screens using the mic should stop. */
export const APP_PAUSE_EVENT = 'riyaaz:pause';

export function setupNative() {
  if (!isNative) return;

  // Hardware back button: go back a screen, or leave the app from the first screen.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  App.addListener('pause', () => {
    window.dispatchEvent(new Event(APP_PAUSE_EVENT));
    getAudioContext().suspend();
  });

  App.addListener('resume', () => {
    getAudioContext().resume();
  });
}

/** Save a text file: share sheet on Android, normal download in the browser. */
export async function saveTextFile(filename, text, mime = 'application/json') {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, files: [uri], dialogTitle: 'Save or send your songs' });
    return;
  }
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Save a recording or other binary file: share sheet on Android, normal download in the browser. */
export async function saveBlobFile(filename, blob, dialogTitle = 'Save or send') {
  if (isNative) {
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title: filename, files: [uri], dialogTitle });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
