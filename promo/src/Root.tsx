import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { Promo, PROMO_FRAMES } from './Promo';
import { FPS } from './theme';

// Load the app's typeface before any frame renders.
const fontLoading = delayRender('Loading Plus Jakarta Sans');
const font = new FontFace('Plus Jakarta Sans', `url(${staticFile('fonts/plus-jakarta-sans.woff2')}) format('woff2')`, {
  weight: '200 800',
});
font
  .load()
  .then(() => {
    document.fonts.add(font);
    continueRender(fontLoading);
  })
  .catch((error: unknown) => {
    console.error('Font failed to load', error);
    continueRender(fontLoading);
  });

export function RemotionRoot() {
  return (
    <Composition id="GripWisePromo" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} />
  );
}
