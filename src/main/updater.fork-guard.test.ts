import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUpdaterModule, warmUpdaterModule } from './updater-test-module-loader'

const { autoUpdaterMock, fetchNewerReleaseTagsMock, moduleFactories, resetUpdaterMocks } =
  await vi.hoisted(async () => (await import('./updater-test-harness')).createUpdaterMocks())

vi.mock('electron', () => moduleFactories.electron())
vi.mock('electron-updater', () => moduleFactories.electronUpdater())
vi.mock('./electron-updater-loader', () => moduleFactories.electronUpdaterLoader())
vi.mock('@electron-toolkit/utils', () => moduleFactories.electronToolkitUtils())
vi.mock('./ipc/pty', () => moduleFactories.ipcPty())
vi.mock('./linux-update-package-type', () => moduleFactories.linuxUpdatePackageType())
vi.mock('./updater-lifecycle-diagnostics', () => moduleFactories.updaterLifecycleDiagnostics())
vi.mock('./updater-changelog', () => moduleFactories.updaterChangelog())
vi.mock('./updater-nudge', () => moduleFactories.updaterNudge())
vi.mock('./update-install-exit-watchdog', () => moduleFactories.updateInstallExitWatchdog())
vi.mock('./updater-prerelease-feed', () => moduleFactories.updaterPrereleaseFeed())
vi.mock('./local-builds/local-build-switch', () => moduleFactories.localBuildSwitch())
vi.mock('./local-builds/local-build-feed-server', () => moduleFactories.localBuildFeedServer())

warmUpdaterModule()

// Why: fork build — the whole suite runs with ORCA_ENABLE_UPSTREAM_UPDATES=1 (vitest config);
// this pins that without it no path reaches the stablyai/orca feed.
describe('fork update guard', () => {
  beforeEach(() => {
    resetUpdaterMocks()
    vi.stubEnv('ORCA_ENABLE_UPSTREAM_UPDATES', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('never checks, downloads or installs upstream releases', async () => {
    const sendMock = vi.fn()
    const { setupAutoUpdater, checkForUpdates, checkForUpdatesFromMenu, downloadUpdate } =
      await loadUpdaterModule()

    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the guard returns before touching the window; only webContents.send is ever reached.
    setupAutoUpdater({ webContents: { send: sendMock } } as never, {
      getLastUpdateCheckAt: () => null
    })
    checkForUpdates()
    checkForUpdatesFromMenu()
    downloadUpdate()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchNewerReleaseTagsMock).not.toHaveBeenCalled()
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled()
    expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled()
    expect(sendMock).toHaveBeenCalledWith(
      'updater:status',
      expect.objectContaining({ state: 'not-available', userInitiated: true })
    )
  })
})
