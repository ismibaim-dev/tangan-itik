// Gets the CSV export off the device: Android's share sheet in the app (save to Files or Drive,
// email it, and so on), or ordinary downloads in a browser.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { CsvFile } from '../data/csv';

const EXPORT_DIR = 'exports';

function download(file: CsvFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deliverCsvFiles(files: CsvFile[]): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (!Capacitor.isNativePlatform()) {
    files.forEach(download);
    return 'downloaded';
  }

  // Exports live in the app's cache, replaced on each export, until the user saves them somewhere.
  await Filesystem.rmdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true }).catch(() => {});
  const uris: string[] = [];
  for (const file of files) {
    const { uri } = await Filesystem.writeFile({
      path: `${EXPORT_DIR}/${file.filename}`,
      directory: Directory.Cache,
      data: file.content,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    uris.push(uri);
  }

  try {
    await Share.share({ title: 'GripWise data export', files: uris, dialogTitle: 'Save or send your GripWise data' });
    return 'shared';
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return 'cancelled';
    throw error;
  }
}
