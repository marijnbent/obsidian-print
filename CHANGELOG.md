# Changelog

## 0.5.9 - 2026-08-13

- Added safe page margins to desktop and mobile print output.
- Documented iOS, iPadOS, and Android printing.

## 0.5.8 - 2026-08-12

- Simplified the iOS print step to one clear Continue to print button.

## 0.5.7 - 2026-08-12

- Generated printable PDFs on iOS so the share sheet offers Print.

## 0.5.6 - 2026-08-12

- Changed iOS printing to use the native share sheet.

## 0.5.5 - 2026-08-12

- Added mobile plugin support and Android browser printing.
- Added complete Bases table printing, including grouped and off-screen rows.
- Embedded local images in Android print documents without overwriting user files.

## 0.5.4 - 2026-04-30

- Fixed themed property printing adding a blank first page.
- Removed duplicated native metadata from generated note prints.

## 0.5.3 - 2026-04-18

- Fixed PDF printing when the rendered document is canvas-based.
- Preserved rendered pages in the print iframe and debug preview.

## 0.5.2 - 2026-04-16

- Disabled plugin install on mobile.
- Fixed PNG printing as rendered output.

## 0.5.1 - 2026-04-16

- Fixed printing rendered non-markdown files such as PNG images.
- Show a notice when a non-markdown file is not open in a printable view.

## 0.5.0 - 2026-04-03

- Improved printed properties/frontmatter styling.
- Added richer frontmatter rendering for booleans, arrays, objects, and links.
- Added a normalized print style option.
- Reused rendered previews and Bases views when available.
- Forced printed output into light mode for readability.
- Expanded print behavior test coverage.
