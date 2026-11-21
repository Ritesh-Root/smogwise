# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/Ritesh-Root/smogwise/security/advisories/new)
rather than a public issue. Include steps to reproduce and the impact you expect. You can expect a first
reply within a few days.

## What is in scope

The deployed app at https://smogwise-295478535981.asia-south1.run.app and the code in this repository.

## How the app is protected

See the Security section of the [README](README.md): strict Content Security Policy, schema validation on
every request, per-client and global rate limits on the paid model calls, restricted API keys held in
Secret Manager, and a non-root container.

## Supported versions

Only the latest commit on `main` is supported.
