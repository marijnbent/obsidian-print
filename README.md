# Obsidian Print

The **Obsidian Print** plugin adds a print functionality to your Obsidian workspace. You can activate the print action from the Command Palette or via the printer ribbon icon.

> [!IMPORTANT]  
>  Printing is currently supported only when you are in the reading view.

## Features

- **Print Action**: Easily print your notes directly from Obsidian.
- **Command Palette Integration**: Activate the print action via the Command Palette.
- **Printer Ribbon Icon**: Access the print function quickly with the printer icon.
- **Direct Print**: Skip the print modal and send your document directly to the default printer.
- **Debug Mode**: Open the print window with your notes content to troubleshoot and adjust styling issues.

## Settings

- **Font Size**: Adjust the font sizes through the settings panel.
- **Direct Print**: Enable to bypass the print dialog and print directly to the default printer.
- **Debug Mode**: Use this to preview and fix styling issues by viewing your notes content in the print window.

## Customize CSS

To customize the appearance of your printed notes, you can adjust the default CSS styling. Below is the default CSS configuration used by the plugin:

```css
body { 
    font-family: sans-serif; 
    margin: 20px; 
    font-size: ${this.settings.fontSize};
}
h1, .inline-title { 
    font-size: ${this.settings.h1Size}; 
    font-weight: bold; 
}
h2 { 
    font-size: ${this.settings.h2Size}; 
}
h3 { 
    font-size: ${this.settings.h3Size}; 
}
h4 { 
    font-size: ${this.settings.h4Size}; 
}
h5 { 
    font-size: ${this.settings.h5Size}; 
}
h6 { 
    font-size: ${this.settings.h6Size}; 
}
.collapse-indicator { 
    display: none; 
}
.metadata-container { 
    display: none; 
}
```

You can modify these styles according to your preferences to achieve the desired look for your printed documents.

## Troubleshooting

If you encounter any issues or need help with styling, enable the Debug Mode to see how your notes appear when printed and make adjustments as needed.