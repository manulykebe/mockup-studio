# Excel VBA Merge Sheets

This project provides a VBA solution for merging data from multiple sheets within an Excel workbook into a single new sheet. 

## Overview

The `MergeSheets` module contains a subroutine that iterates through all worksheets in the workbook, collects the data, and appends it to a newly created sheet. This is useful for consolidating data from various sources into one location for easier analysis and reporting.

## Files

- **src/Modules/MergeSheets.bas**: Contains the VBA code for merging sheets.
- **src/Workbook.xlsm**: The Excel workbook that contains the VBA project and allows execution of the merging code.
- **.gitignore**: Specifies files and directories to be ignored by Git.

## Usage Instructions

1. Open the `Workbook.xlsm` file in Excel.
2. Press `ALT + F11` to open the VBA editor.
3. Locate the `MergeSheets` module in the Project Explorer.
4. Run the `MergeData` subroutine to merge data from all sheets into a new sheet named "MergedData".

## Requirements

- Microsoft Excel with macro support enabled.
- Basic understanding of how to run VBA code.

## License

This project is open-source and available for modification and distribution. Please refer to the license file for more details.