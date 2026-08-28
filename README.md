# Print

The Print plugin adds printing tools to your Obsidian workspace. You can print the current note, a text selection, or all notes in a folder from the command palette, the printer ribbon, or the context menu. If you like it or find it useful, please consider giving it a [star ![GitHub Repo stars](https://img.shields.io/github/stars/marijnbent/obsidian-print?style=social)](https://github.com/marijnbent/obsidian-print) on GitHub.

https://github.com/user-attachments/assets/5882f08c-19e6-46da-b808-608b95376979

*Screen recording of the plugin in use.*

## Features

- **Print the current note**: Trigger printing from the command palette, the printer ribbon, or by right-clicking a note.
- **Print a selection**: Print only the selected text from the active editor.
- **Print all notes in a folder**: Right-click on a folder or use the command palette to print all markdown notes in that folder.
- **Print on desktop and mobile**: Use the system print dialog on desktop, generate an A4 PDF on iOS, or open a standalone print document in your Android browser.

You can also add a shortcut to the print action for even quicker access.

| | |
|:------:|:-------------------------:|
|![image](https://github.com/user-attachments/assets/8ba2959c-20a2-4cab-8ae7-c2f5f2475217)|![image](https://github.com/user-attachments/assets/ddb54bd0-4b58-410f-9d69-0f6a58b2ddfd)

## Support

If you are enjoying this plugin then please support my work and enthusiasm by buying me a coffee
on [https://www.buymeacoffee.com/marijnbent](https://www.buymeacoffee.com/marijnbent).

<a href="https://www.buymeacoffee.com/marijnbent"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=marijnbent&button_colour=6495ED&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"></a>

## Getting Started

### Install from the Community Plugin Store

1. Open Obsidian and go to **Settings** > **Community plugins**.
2. Click on **Browse** and search for **Print**.
3. Click **Install** to add the plugin to your Obsidian setup.
4. Once installed, enable the plugin and optionally go to the settings page.

If you print often, you probably want to add a shortcut to one or more print commands. Go to **Settings** > **Hotkeys**, search for `print`, and bind your preferred shortcuts.

## Settings

- **Print note title**: Include the note title in the printout.
- **Print properties**: Include note properties/frontmatter at the top of the printed note.
- **Font size and heading sizes**: Adjust body text and heading sizes when **Normalize style** is enabled.
- **Combine folder notes**: Remove page breaks between notes when printing all notes from a folder.
- **Treat horizontal lines as page breaks**: Interpret `---` separators as print page breaks.
- **Debug mode**: Open a separate inspection window with the generated HTML and CSS so you can troubleshoot styling issues.
- **Inherit note `cssclasses`**: Apply Obsidian note `cssclasses` to printed output so note-specific print CSS can carry over.
- **Normalize style**: Use a neutral built-in print style instead of carrying over the active Obsidian theme styling.
- **Custom CSS**: In Advanced settings, enable a `print.css` snippet from Obsidian's CSS snippets folder when available.

![image](https://github.com/user-attachments/assets/2ffed185-cc8f-43d9-8444-7cb9657d61f7)

## Customize CSS

In the settings, you can optionally hide the title, and when **Normalize style** is enabled you can also adjust the font size for body text and headings.

To further customize the appearance of your printed notes, create a CSS snippet named `print.css` in your vault's configured snippets folder. You can then enable it from the plugin settings after Obsidian detects it. The printed document's body contains the `obsidian-print` class. Be sure to either wrap your CSS in `@media print` or prefix your print-specific CSS with `.obsidian-print` so it only applies to printed content. If you enable **Inherit note `cssclasses`**, note-level Obsidian classes will be available in the printed output as well. Theme styles for code blocks and MathJax are also carried into the print document when needed, unless you enable **Normalize style** to use the plugin's neutral fallback styling instead. Print output uses a 12 mm page margin by default. You can view the default styles [in this file](/styles.css). Every individual note contains the `obsidian-print-note` class.

If you have trouble with the styling, enable Debug Mode to open an inspection window for the generated print document.

## Mobile printing

The plugin supports Obsidian on iPhone, iPad, and Android.

- **iOS and iPadOS**: The plugin generates an A4 PDF and shows a **Continue to print** button. Tap it to open the native share sheet, then select **Print**. Each PDF page is an image so Obsidian styles, local images, and characters stay intact. The text in the PDF is not selectable.
- **Android**: The plugin saves a standalone HTML print document in the vault and opens it in your default browser. Use the browser menu to print it. Local images are included. The plugin reuses only files that it generated and does not replace your files.

## Privacy and network use

The plugin has no telemetry, accounts, or plugin-owned online service. It does not upload vault content. Printing can load remote images that are already embedded in a note. Those requests go to the image host. Local images are read through the Obsidian vault API and are included as local data in portable print documents.
