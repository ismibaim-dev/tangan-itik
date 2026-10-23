import { linearTiming, type TransitionPresentation, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { AbsoluteFill, Html5Audio, staticFile } from 'remotion';
import { Adapts, Guided, Private, Progress } from './scenes/Features';
import { Hook, Problem, Reveal } from './scenes/Intro';
import { CallToAction } from './scenes/Outro';
import { BAR, FONT, TRANSITION } from './theme';

const timing = linearTiming({ durationInFrames: TRANSITION });

/**
 * Each scene starts on a bar line of the 120 BPM soundtrack. A scene that hands over to the next
 * runs TRANSITION frames longer, because the transition overlaps the two.
 */
const scenes = [
  { bars: 2, Scene: Hook },
  { bars: 1, Scene: Problem },
  { bars: 2, Scene: Reveal },
  { bars: 2, Scene: Guided },
  { bars: 2, Scene: Adapts },
  { bars: 2, Scene: Progress },
  { bars: 2, Scene: Private },
  { bars: 2, Scene: CallToAction },
];

export const PROMO_FRAMES = scenes.reduce((total, s) => total + s.bars * BAR, 0);

// Mixed presentation types, so widen them to one type for the array.
const transitions = [
  fade(),
  wipe({ direction: 'from-bottom' }),
  slide({ direction: 'from-bottom' }),
  slide({ direction: 'from-right' }),
  slide({ direction: 'from-right' }),
  slide({ direction: 'from-right' }),
  wipe({ direction: 'from-left' }),
] as unknown as TransitionPresentation<Record<string, unknown>>[];

export function Promo() {
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: '#133933' }}>
      <TransitionSeries>
        {scenes.flatMap(({ bars, Scene }, i) => {
          const last = i === scenes.length - 1;
          const sequence = (
            <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={bars * BAR + (last ? 0 : TRANSITION)}>
              <Scene />
            </TransitionSeries.Sequence>
          );
          return last
            ? [sequence]
            : [sequence, <TransitionSeries.Transition key={`transition-${i}`} presentation={transitions[i]!} timing={timing} />];
        })}
      </TransitionSeries>
      <Html5Audio src={staticFile('music.wav')} />
    </AbsoluteFill>
  );
}
