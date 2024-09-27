# Print

The Print plugin adds print functionality to your Obsidian workspace. You can activate the print action from the command palette, the printer ribbon or by right-clicking a note. If you like it or find it useful, please consider give it a [star ![GitHub Repo stars](https://img.shields.io/github/stars/marijnbent/obsidian-print?style=social)](https://github.com/marijnbent/obsidian-print) on Github.

https://github.com/user-attachments/assets/5882f08c-19e6-46da-b808-608b95376979

*Screen recording of the plugin in use.*

## Features

- **Print notes**: Simply but effective. Activate the print action via the command palette, the printer ribbon or by right-clicking a note.
- **Print all notes in a folder**: Right-click on a folder or use the command palette to print all notes in a folder.

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

If you print often, you probably want to add a shortcode to the print action. Go to **Settings** > **Hotkeys**, search for 'print' and bind your preferred shortcut. 

## Settings

- **Include note title**: Enable to print the title.
- **Font size**: Adjust the font sizes through the settings panel.
- **Combine folder notes**: Enable to remove page breaks between notes when printing all notes from a folder.
- **Debug mode**: Use this to preview and fix styling issues by viewing your notes content in the print window.

![image](https://github.com/user-attachments/assets/2ffed185-cc8f-43d9-8444-7cb9657d61f7)

## Customize CSS

In the settings, you can adjust the font size for all headings and text, and optionally hide the title.

To further customize the appearance of your printed notes, you can create a `print.css` snippet. The printed document's body contains the `obsidian-print` class. Be sure to either add wrap your CSS in `@media print` or prefix your print-specific CSS with `obsidian-print` class so that it only applies to printed content. You can view the default styles [in this file](/styles.css). Every individual note contains the `obsidian-print-note` class.

If you have trouble with the styling, enable Debug Mode to log the HTML of the printed notes.
