export interface UpgradeCheck {
  /** When the registry was last asked, so it is asked at most once a day. */
  readonly checkedAt?: string
  /** The newest version the registry named. */
  readonly latest?: string
  /** The version already mentioned once, so it is not mentioned again. */
  readonly told?: string
  readonly note?: string
}

export interface UpgradeLog {
  readonly read: () => Promise<UpgradeCheck>
  readonly write: (check: UpgradeCheck) => Promise<void>
}
