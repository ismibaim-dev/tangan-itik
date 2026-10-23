// Matches the app's tokens in client/src/styles.css.
export const color = {
  brand950: '#0b2420',
  brand900: '#133933',
  brand800: '#18473f',
  brand700: '#1b594d',
  brand600: '#1f6e5f',
  brand500: '#2b8875',
  brand300: '#74c2af',
  brand200: '#a8dbcd',
  brand100: '#d3ede6',
  brand50: '#ecf7f4',
  coral: '#e9643b',
  coral400: '#f4845f',
  coral100: '#ffe3d7',
  sand: '#f6f3ed',
  sand200: '#ebe6dc',
  ink: '#15302d',
  inkSoft: '#4b5f5c',
  chart: '#0e8c6a',
  white: '#ffffff',
};

export const FONT = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';

export const FPS = 30;
/** 120 BPM: one bar is two seconds. Every scene starts on a bar line. */
export const BAR = 2 * FPS;
/** Transitions overlap the end of one scene with the start of the next. */
export const TRANSITION = 12;
