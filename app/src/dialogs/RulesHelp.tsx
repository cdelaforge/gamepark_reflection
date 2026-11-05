import { css } from '@emotion/react'
import { Element } from '@gamepark/reflection/material/Element'
import { useTranslation } from 'react-i18next'
import portal from '../images/portal.svg?no-inline'
import blackHoleAbsorbs from '../images/rules/black-hole-absorbs.png'
import laserPath from '../images/rules/laser-path.png'
import lightWarp from '../images/rules/light-warp.png'
import locked from '../images/rules/locked.png'
import mirrorReflects from '../images/rules/mirror-reflects.png'
import puzzle from '../images/rules/puzzle.png'
import solved from '../images/rules/solved.png'
import { elementImages } from '../material/Material'

const mirrors = [Element.Slash, Element.BackSlash, Element.Vertical, Element.Horizontal]
const specialShapes = [Element.Square, Element.TriangleA, Element.TriangleB]

/**
 * The rules of the game, opened from the question mark of the header
 */
export const RulesHelp = () => {
  const { t } = useTranslation()
  return (
    <>
      <h2>{t('rules.title')}</h2>
      <h3>{t('rules.goal')}</h3>
      <p>{t('rules.goal.1')}</p>
      <h3>{t('rules.material')}</h3>
      <div css={rowCss}>
        <div>
          {mirrors.map(id => (
            <img key={id} src={elementImages[id]} alt="" css={elementCss} />
          ))}
        </div>
        <p>{t('rules.material.mirrors')}</p>
      </div>
      <div css={rowCss}>
        <div>
          {specialShapes.map(id => (
            <img key={id} src={elementImages[id]} alt="" css={elementCss} />
          ))}
        </div>
        <p>{t('rules.material.special-shapes')}</p>
      </div>
      <div css={rowCss}>
        <img src={elementImages[Element.BlackHole]} alt="" css={elementCss} />
        <p>{t('rules.material.black-holes')}</p>
      </div>
      <div css={rowCss}>
        <img src={portal} alt="" css={elementCss} />
        <p>{t('rules.material.light-warps')}</p>
      </div>
      <div css={figuresCss}>
        <img src={mirrorReflects} alt="" css={cellCss} />
        <img src={blackHoleAbsorbs} alt="" css={cellCss} />
        <img src={lightWarp} alt="" css={cellCss} />
      </div>
      <h3>{t('rules.clues')}</h3>
      <p>{t('rules.clues.1')}</p>
      <ul>
        <li>{t('rules.clues.green')}</li>
        <li>{t('rules.clues.yellow')}</li>
        <li>{t('rules.clues.grey')}</li>
      </ul>
      <p>{t('rules.clues.2')}</p>
      <p>{t('rules.clues.3')}</p>
      <div css={figuresCss}>
        <img src={puzzle} alt="" css={gridCss} />
        <img src={laserPath} alt="" css={gridCss} />
      </div>
      <h3>{t('rules.play')}</h3>
      <ul>
        <li>{t('rules.play.start')}</li>
        <li>{t('rules.play.place')}</li>
        <li>{t('rules.play.remove')}</li>
        <li>
          <img src={locked} alt="" css={inlineCss} />
          {t('rules.play.lock')}
        </li>
        <li>{t('rules.play.keys')}</li>
        <li>{t('rules.play.solved')}</li>
        <li>{t('rules.play.give-up')}</li>
        <li>{t('rules.play.settings')}</li>
      </ul>
      <div css={figuresCss}>
        <img src={solved} alt="" css={gridCss} />
      </div>
      <h3>{t('rules.multi')}</h3>
      <p>{t('rules.multi.1')}</p>
      <p>{t('rules.multi.2')}</p>
      <p>{t('rules.multi.3')}</p>
      <h3>{t('rules.solo')}</h3>
      <p>{t('rules.solo.1')}</p>
      <ul>
        <li>{t('rules.solo.easy')}</li>
        <li>{t('rules.solo.medium')}</li>
        <li>{t('rules.solo.hard')}</li>
      </ul>
      <h3>{t('rules.tips')}</h3>
      <p>{t('rules.tips.1')}</p>
    </>
  )
}

const rowCss = css`
  display: flex;
  align-items: center;
  gap: 0.5em;

  > div {
    flex-shrink: 0;
    display: flex;
    gap: 0.2em;
  }

  > p {
    margin: 0.3em 0;
  }
`

const elementCss = css`
  width: 1.6em;
  height: 1.6em;
  background-color: #55586b;
  border-radius: 0.1em;
`

const inlineCss = css`
  height: 1.6em;
  vertical-align: middle;
  margin-right: 0.4em;
`

const figuresCss = css`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1em;
  margin: 1em 0;
`

const cellCss = css`
  height: 3em;
`

// The same height for the grids side by side, with or without the stock
const gridCss = css`
  height: 11em;
  max-width: 100%;
  object-fit: contain;
`
