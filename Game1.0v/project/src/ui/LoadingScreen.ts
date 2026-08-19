const minimumVisibleDurationMs = 900

export const hideLoadingScreen = (): void => {
  const loadingScreen = document.querySelector<HTMLElement>('#loading-screen')

  if (!loadingScreen) {
    return
  }

  window.setTimeout(() => {
    loadingScreen.classList.add('loading-screen--hidden')
  }, minimumVisibleDurationMs)
}
