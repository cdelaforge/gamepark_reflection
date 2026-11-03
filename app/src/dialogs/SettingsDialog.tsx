import { css } from '@emotion/react'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog, ThemeButton } from '@gamepark/react-game'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { usePortrait } from '../locators/Layout'
import { tableButtonCss } from './ScoreDialog'

/**
 * The display preferences of the player, kept in this browser only: they do not change the game of the other players.
 * The stock has a position for each orientation of the screen, so that turning the phone keeps both choices.
 */
export type Settings = { stockLeft: boolean; stockAbove: boolean; hoverPreview: boolean }

const KEY = 'reflection.settings'
const defaults: Settings = { stockLeft: true, stockAbove: true, hoverPreview: true }

const load = (): Settings => {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

let settings = load()
const listeners = new Set<() => void>()

const setSettings = (change: Partial<Settings>) => {
  settings = { ...settings, ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // A private window may refuse the storage: the settings last until the page is closed
  }
  listeners.forEach(listener => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSettings = () => settings

export const useSettings = () => useSyncExternalStore(subscribe, getSettings)

// A touch screen has no mouse over the cells
const canHover = window.matchMedia('(hover: hover)').matches

export const SettingsButton = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <ThemeButton css={tableButtonCss} onClick={() => setOpen(true)} title={t('settings.title')} aria-label={t('settings.title')}>
        <FontAwesomeIcon icon={faGear} />
      </ThemeButton>
      <Dialog open={open} onBackdropClick={() => setOpen(false)} css={dialogCss}>
        <h2>{t('settings.title')}</h2>
        <SettingsForm />
        <div css={closeCss}>
          <ThemeButton onClick={() => setOpen(false)}>{t('button.close')}</ThemeButton>
        </div>
      </Dialog>
    </>
  )
}

const SettingsForm = () => {
  const { t } = useTranslation()
  const { stockLeft, stockAbove, hoverPreview } = useSettings()
  const portrait = usePortrait()
  const [first, second] = portrait ? ['above', 'below'] : ['left', 'right']
  const isFirst = portrait ? stockAbove : stockLeft
  const setFirst = (value: boolean) => setSettings(portrait ? { stockAbove: value } : { stockLeft: value })
  return (
    <div css={formCss}>
      <fieldset>
        <legend>{t('settings.stock')}</legend>
        <label>
          <input type="radio" name="stock" checked={isFirst} onChange={() => setFirst(true)} /> {t(`settings.stock.${first}`)}
        </label>
        <label>
          <input type="radio" name="stock" checked={!isFirst} onChange={() => setFirst(false)} /> {t(`settings.stock.${second}`)}
        </label>
      </fieldset>
      {canHover && (
        <label>
          <input type="checkbox" checked={hoverPreview} onChange={event => setSettings({ hoverPreview: event.target.checked })} /> {t('settings.hover-preview')}
        </label>
      )}
    </div>
  )
}

const dialogCss = css`
  font-size: calc(3em * var(--gp-scale));
  max-width: 90vw;

  h2 {
    margin: 0 0 0.5em;
    text-align: center;
  }
`

const closeCss = css`
  text-align: center;
`

const formCss = css`
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  margin-bottom: 1em;

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 1em;

    // On a portrait screen, one choice by line
    @media (max-aspect-ratio: 1/1) {
      flex-direction: column;
      gap: 0.3em;
    }
  }

  label {
    white-space: nowrap;
  }

  legend {
    padding: 0;
    margin-bottom: 0.3em;
  }

  input {
    width: 1em;
    height: 1em;
    vertical-align: middle;
  }
`
