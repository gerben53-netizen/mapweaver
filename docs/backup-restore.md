# Full backups and restore

Open Project → Storage → Storage & backups. Save stores the current project in SQLite; Export project transfers a single editable map. Back up all data includes the SQLite snapshot and every registered original/preview, including projects in Trash and asset sizing metadata. Unregistered orphan files, logs, old backups and machine-specific paths are not part of the portable dataset; integrity lists leftovers for manual inspection.

Choose Back up all data, then a destination outside Downloads. Chrome/Edge's file picker writes the response in chunks. Other browsers use their native download manager: enable “Ask where to save each file”. The service validates the entire on-disk archive and database before offering it; the browser must still finish writing the destination. Keep the verified archive on another disk for disk-failure protection.

Restore all data accepts Sprint 12 format 1 and the new ZIP64 format 2. Choose the ZIP and wait for validation, then review its name/date and choose Replace all local data. Save or export unsaved work in **all** browsers first. Staging can be cancelled. The actual replacement cannot be cancelled mid-switch: it completes or rolls back. Success is reported only after reopening and validating the replacement. Reload explicitly afterwards; stale tabs cannot write across a dataset generation change. Recovery copies from a prior/unknown generation require an explicit separate-project save or export, never an automatic overwrite.

## Storage and recovery points

The normal data location is unchanged. Sibling `<data-directory>.operations` stores uploads, verified backup jobs, staging and rollback directories on the same volume. Rollback points are retained indefinitely: **automatic deletion/rotation is disabled**. Storage reports their size. After verifying a separate backup and the restored dataset, an experienced user may stop Mapweaver and remove identified older rollback directories. Never delete a restore journal or the only recovery point to resolve an error. Staging left by an interrupted process is reported for manual inspection, never executed.

At startup an unfinished replacement journal rolls back to the previous directory before SQLite opens. If permissions or an external file lock prevent recovery, startup stops and keeps the datasets for manual help. Do not rename/delete them while the service is running.

To adopt another storage location: stop Mapweaver, configure an absolute MAPWEAVER_DATA_DIR for the launcher/service, start the empty destination and restore a verified full backup there. Retain the previous whole directory. Never move SQLite alone. There is no unvalidated path picker in the browser.

## Limits

Default configurable safety limit: 256 GiB (`MAPWEAVER_BACKUP_MAX_BYTES`, integer bytes, at least 1 GiB). At most 100,001 archive entries, 32 MiB manifest and 200:1 expansion. Images retain their existing per-file decode limits. ZIP64 with STORE compression avoids wasting CPU on already-compressed images. Plan disk space for snapshot, archive, validation extraction and retained rollback. Free space is checked before and during writing; filesystem write errors fail safely. Use NTFS/exFAT for files over 4 GiB; when browser target filesystem checks are unavailable, destination-write errors are reported and the validated local archive remains available. No archive-size guarantee is inferred from download start.
