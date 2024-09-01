# Obsidian Print

The **Obsidian Print** plugin adds print functionality to your Obsidian workspace. You can activate the print action from the command palette, the printer ribbon or by right-clicking a note.

https://github.com/user-attachments/assets/5882f08c-19e6-46da-b808-608b95376979

## Features

- **Print notes!**: Simply but effective. Activate the print action via the command palette, the printer ribbon or by right-clicking a note.
- **Print all notes in a folder**: Right-click on a folder or use the command palette to print all notes in a folder.

You can also add a shortcut to the print action for even quicker access.

## Getting Started

The plugin has been submitted to the community plugin store. While it’s under review, you can install the plugin using one of two methods: manually or via BRAT.

### Option 1: Install via BRAT (Beta Reviewers Auto-update Tool)

BRAT is a tool that allows you to install and manage plugins that are not yet available in the Obsidian community store. To install the plugin via BRAT:

1. Install the BRAT plugin from the community plugin store if you haven't already.
2. Once BRAT is installed, open the settings in Obsidian and navigate to the BRAT settings tab.
3. Under "Add a beta plugin for testing," paste the following repository URL: `https://github.com/marijnbent/obsidian-print`.
4. Click "Add Plugin."
5. The plugin will now appear under your installed plugins. Enable it and start printing!

### Option 2: Manual Installation

You can also install the plugin manually by following these steps:

1. Go to the [latest release](https://github.com/marijnbent/obsidian-print/releases/latest) page and download these three files: `manifest.json`, `styles.css`, and `main.js`.
2. In your Obsidian plugins directory, create a new folder called `obsidian-print`.
3. Move the downloaded files into the `obsidian-print` folder.
4. That’s it! Enable the plugin in Obsidian and start printing.

For additional help, you can watch [this video tutorial](https://www.youtube.com/watch?v=ffGfVBLDI_0).

## Settings

- **Include note title**: Enable to print the title.
- **Font size**: Adjust the font sizes through the settings panel.
- **Combine folder notes**: Enable to remove page breaks between notes when printing all notes from a folder.
- **Debug mode**: Use this to preview and fix styling issues by viewing your notes content in the print window.

![image](https://github.com/user-attachments/assets/0c5cd1ac-0a7e-4909-914d-75c0c1e38e88)

## Roadmap

Here are some upcoming features I would like to implement:

- **Display Images**

If you would like to contribute, please get in touch or make a pull request!

## Customize CSS

In the settings, you can adjust the font size for all headings and text, and optionally hide the title.

To further customize the appearance of your printed notes, you can create a `print.css` snippet. The printed document's body contains the `obsidian-print` class. Be sure to either add wrap your CSS in `@media print` or prefix your print-specific CSS with `obsidian-print` class so that it only applies to printed content. You can view the default styles [in this file](/styles.css). Every individual note contains the `obsidian-print-note` class.

If you have trouble with the styling, enable Debug Mode to log the HTML of the printed notes.
