/**
 * The Custom Order Studio's items and the questions asked for each (from the client's prototype).
 * A "text" question is optional and only asked when an earlier answer says "Custom…" (a custom size).
 */
export interface CustomQuestion {
  label: string;
  /** Options to pick from; none: a short text answer. */
  options?: string[];
  placeholder?: string;
  /** Asked only when the previous answer starts with this (e.g. "Custom"). */
  onlyIf?: string;
  /** A text answer that must be given. */
  required?: boolean;
}
export interface CustomKind {
  key: 'notebook' | 'canvas' | 'pen' | 'paper' | 'sketchbook' | 'sticker' | 'folder' | 'other';
  label: string;
  hint: string;
  questions: CustomQuestion[];
}

export const CUSTOM_KINDS: CustomKind[] = [
  {
    key: 'notebook',
    label: 'Custom notebook',
    hint: 'School, branded, corporate',
    questions: [
      { label: 'Notebook type', options: ['Spiral Notebook', 'Perfect Bound Notebook', 'Hardcover Notebook', 'Exercise Book', 'Journal / Diary', 'Custom School Notebook'] },
      { label: 'Finished size', options: ['A4', 'A5', 'B5', 'A6', 'Custom Size'] },
      { label: 'Custom size (cm)', placeholder: 'e.g. 15 × 21 cm', onlyIf: 'Custom' },
      { label: 'Number of pages', options: ['40', '60', '80', '100', '120', '160', '200', 'Custom Page Count'] },
      { label: 'Page type', options: ['Ruled', 'Unruled / Blank', 'Grid / Graph', 'Dot Grid', 'Custom Printed Pages'] },
      { label: 'Inner paper GSM', options: ['70 GSM', '80 GSM', '100 GSM', '120 GSM', 'Other / Need advice'] },
      { label: 'Cover type', options: ['Soft Cover', 'Hard Cover', 'Art Card', 'Kraft Cover', 'Custom Cover'] },
      { label: 'Binding', options: ['Spiral', 'Wire-O', 'Perfect Binding', 'Staple / Saddle Stitch', 'Sewn'] },
      { label: 'Cover print', options: ['Full Color', 'Single Color', 'No Print', 'Custom Artwork'] },
      { label: 'Finishing', options: ['Matte Lamination', 'Gloss Lamination', 'No Lamination', 'Spot UV / Special Finishing'] },
    ],
  },
  {
    key: 'canvas',
    label: 'Custom canvas',
    hint: 'Blank, stretched, printed',
    questions: [
      { label: 'Canvas type', options: ['Stretched Canvas', 'Canvas Board', 'Canvas Roll', 'Custom Printed Canvas'] },
      { label: 'Size', options: ['8 × 10 inch', '10 × 12 inch', '12 × 16 inch', '16 × 20 inch', '20 × 24 inch', 'Custom Size'] },
      { label: 'Custom size (W × H)', placeholder: 'e.g. 18 × 24 inch', onlyIf: 'Custom' },
      { label: 'Canvas material', options: ['Cotton', 'Polyester', 'Cotton Blend', 'Need Recommendation'] },
      { label: 'Surface', options: ['Primed White', 'Natural / Unprimed', 'Custom Print'] },
      { label: 'Frame / Edge', options: ['Framed / Stretched', 'Board Only', 'Roll Only', 'No Frame'] },
      { label: 'Orientation', options: ['Portrait', 'Landscape', 'Square'] },
    ],
  },
  {
    key: 'pen',
    label: 'Custom printed pen',
    hint: 'Company logo, events, gifts',
    questions: [
      { label: 'Pen type', options: ['Ballpoint', 'Gel Pen', 'Metal Pen', 'Plastic Pen', 'Pencil', 'Other Writing Instrument'] },
      { label: 'Ink color', options: ['Blue', 'Black', 'Red', 'Mixed / Other'] },
      { label: 'Body color', options: ['White', 'Black', 'Blue', 'Green', 'Assorted / Other'] },
      { label: 'Branding method', options: ['One-Color Logo', 'Full-Color Print', 'Engraving', 'No Branding'] },
      { label: 'Logo position', options: ['On Barrel', 'On Clip', 'Multiple Positions', 'Need Advice'] },
      { label: 'Packaging', options: ['Loose', 'Individual Sleeve', 'Gift Box', 'Custom Pack'] },
    ],
  },
  {
    key: 'paper',
    label: 'Custom paper & card',
    hint: 'Size, GSM, print, cut',
    questions: [
      { label: 'Paper type', options: ['Art Paper', 'Art Card', 'Certificate Paper', 'Sticker Paper', 'Kraft Paper', 'Handmade Paper', 'Photo Paper', 'Other Paper'] },
      { label: 'Size', options: ['A4', 'A3', 'A5', 'SRA3', 'Custom Cut Size'] },
      { label: 'Custom size (W × H)', placeholder: 'e.g. 21 × 29.7 cm', onlyIf: 'Custom' },
      { label: 'GSM', options: ['80 GSM', '100 GSM', '120 GSM', '150 GSM', '200 GSM', '250 GSM', '300 GSM', 'Other'] },
      { label: 'Finish', options: ['Matte', 'Gloss', 'Textured', 'Uncoated', 'Metallic / Specialty'] },
      { label: 'Print requirement', options: ['Blank Sheets', 'Single-Side Print', 'Double-Side Print', 'Die Cut / Shape Cut'] },
      { label: 'Color', options: ['White', 'Cream', 'Black', 'Color Assorted', 'Specific / Custom'] },
    ],
  },
  {
    key: 'sketchbook',
    label: 'Custom sketchbook',
    hint: 'Drawing, watercolour, mixed media',
    questions: [
      { label: 'Product type', options: ['Sketchbook', 'Watercolor Pad', 'Marker Pad', 'Drawing Pad', 'Mixed Media Book'] },
      { label: 'Size', options: ['A4', 'A5', 'A3', 'Square', 'Custom Size'] },
      { label: 'Custom dimensions', placeholder: 'e.g. 20 × 20 cm', onlyIf: 'Custom' },
      { label: 'Paper GSM', options: ['120 GSM', '160 GSM', '200 GSM', '250 GSM', '300 GSM', 'Other'] },
      { label: 'Texture', options: ['Smooth / Hot Press', 'Cold Press', 'Rough', 'Mixed / Custom'] },
      { label: 'Sheet count', options: ['20', '30', '40', '50', '100', 'Other'] },
      { label: 'Binding', options: ['Spiral', 'Glue Pad', 'Stitched', 'Loose Sheets'] },
    ],
  },
  {
    key: 'sticker',
    label: 'Custom labels & stickers',
    hint: 'Labels, die-cut, sheets',
    questions: [
      { label: 'Sticker type', options: ['Product Label', 'Die-Cut Sticker', 'Sticker Sheet', 'Packaging Seal', 'Transparent Sticker'] },
      { label: 'Sticker size', options: ['2 × 2 inch', '3 × 3 inch', 'A4 Sheet', 'Custom Size'] },
      { label: 'Custom dimensions', placeholder: 'e.g. 5 × 8 cm', onlyIf: 'Custom' },
      { label: 'Material', options: ['Matte Paper', 'Gloss Paper', 'Vinyl', 'Transparent', 'Kraft'] },
      { label: 'Shape', options: ['Rectangle', 'Circle', 'Oval', 'Custom Die Cut'] },
      { label: 'Print colors', options: ['Full Color', 'Black & White', 'Spot Colors'] },
    ],
  },
  {
    key: 'folder',
    label: 'Custom office folder',
    hint: 'Branded folders, document holders',
    questions: [
      { label: 'Folder type', options: ['Presentation Folder', 'Document File', 'Certificate Folder', 'Pocket Folder', 'Envelope'] },
      { label: 'Size', options: ['A4', 'A5', 'Legal', 'Custom Size'] },
      { label: 'Material', options: ['Art Card', 'Kraft Card', 'PVC', 'Other'] },
      { label: 'Printing', options: ['Full Color', 'One Color', 'Embossed Logo', 'No Print'] },
      { label: 'Finishing', options: ['Matte', 'Gloss', 'Foil', 'Spot UV', 'No Finish'] },
    ],
  },
  {
    key: 'other',
    label: 'Something else',
    hint: 'Tell us what you need',
    questions: [
      { label: 'Product name', placeholder: 'e.g. custom art gift set', required: true },
      { label: 'Material / Type', placeholder: 'Material or finish' },
      { label: 'Preferred size', placeholder: 'Dimensions, if relevant' },
      { label: 'Customization needed', options: ['Logo Printing', 'Artwork Printing', 'Special Size', 'Special Packaging', 'Other / Discuss'] },
    ],
  },
];
