# Obsidian Print

The **Obsidian Print** plugin adds a print functionality to your Obsidian workspace. You can activate the print action from the Command Palette or via the printer ribbon icon.

![Export-1725021591298](https://github.com/user-attachments/assets/9ab00cc7-1fd4-4841-9a3f-92ea366417d8)

> [!IMPORTANT]  
>  Printing is supported only when you are in the reading view. To switch to reading mode, use the icon in the top right corner, run "Toggle Reading Mode" via the Command Palette or use the shortcut (Cmd/Ctrl + E).

## Features

- **Command Palette Action**: Activate the print action via the Command Palette.
- **Printer Ribbon Icon**: Activate the print function quickly with the printer icon.
- **Direct Print**: Skip the print modal and send your document directly to the default printer.
- **Debug Mode**: Open the print window with your notes content to troubleshoot and adjust styling issues.

You can also add a shortcut to the print action for even quicker access.

## Settings

- **Font Size**: Adjust the font sizes through the settings panel.
- **Direct Print**: Enable to bypass the print dialog and print directly to the default printer.
- **Debug Mode**: Use this to preview and fix styling issues by viewing your notes content in the print window.

![image](https://github.com/user-attachments/assets/438f07ea-de26-49f2-8673-1c51014ee4db)

## Roadmap

Here are some upcoming features I would like to implement:

- **Automatically switch to reading mode**: A feature to automatically switch to reading mode before printing. This is currently prototypes, but does not work for new notes. Assistance from the community is welcome!
- **Display Images**

If you would like to contribute, please get in touch or make a pull request!

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
