import type { RequiredDataFromCollectionSlug } from 'payload'

/**
 * Starting catalog of blanks. Dimensions come from the silicone case listing
 * in the project brief and are a starting scale only: wall thickness, camera
 * island height and corner radius must come from calipers on a physical
 * sample before the Blender shell is modelled.
 */
export const seedPhoneModels: RequiredDataFromCollectionSlug<'phoneModels'>[] = [
  {
    name: 'iPhone 17 Pro',
    slug: 'iphone-17-pro',
    brand: 'apple',
    screenInches: 6.3,
    releaseYear: 2025,
    status: 'active',
    sortOrder: 10,
    geometryNotes: 'No measured sample yet.',
  },
  {
    name: 'iPhone 17 Pro Max',
    slug: 'iphone-17-pro-max',
    brand: 'apple',
    screenInches: 6.9,
    releaseYear: 2025,
    status: 'active',
    sortOrder: 20,
    heightMm: 165,
    widthMm: 81,
    depthMm: 13,
    geometryNotes:
      'Supplier listing size for the 6.9-inch blank: 16.5 × 8.1 × 1.3 cm (confirmed 2026-09-08). Outer envelope only; wall thickness, corner radius and camera island still need calipers.',
  },
  {
    name: 'iPhone 17',
    slug: 'iphone-17',
    brand: 'apple',
    screenInches: 6.3,
    releaseYear: 2025,
    status: 'active',
    sortOrder: 30,
    geometryNotes: 'No measured sample yet.',
  },
  {
    name: 'iPhone Air',
    slug: 'iphone-air',
    brand: 'apple',
    screenInches: 6.5,
    releaseYear: 2025,
    status: 'comingSoon',
    sortOrder: 40,
  },
  {
    name: 'iPhone 16 Pro',
    slug: 'iphone-16-pro',
    brand: 'apple',
    screenInches: 6.3,
    releaseYear: 2024,
    status: 'comingSoon',
    sortOrder: 50,
  },
  // Android. Prototype: every model shares the iPhone 17 Pro Max shell and
  // renders until real blanks exist (Jace, 2026-09-11: function before form).
  {
    name: 'Galaxy S25 Ultra',
    slug: 'galaxy-s25-ultra',
    brand: 'samsung',
    screenInches: 6.9,
    releaseYear: 2025,
    status: 'active',
    sortOrder: 60,
    geometryNotes: 'Placeholder. Uses the shared iPhone shell render.',
  },
  {
    name: 'Galaxy S25',
    slug: 'galaxy-s25',
    brand: 'samsung',
    screenInches: 6.2,
    releaseYear: 2025,
    status: 'active',
    sortOrder: 70,
    geometryNotes: 'Placeholder. Uses the shared iPhone shell render.',
  },
  {
    name: 'Pixel 9 Pro',
    slug: 'pixel-9-pro',
    brand: 'google',
    screenInches: 6.3,
    releaseYear: 2024,
    status: 'active',
    sortOrder: 80,
    geometryNotes: 'Placeholder. Uses the shared iPhone shell render.',
  },
  {
    name: 'Pixel 9',
    slug: 'pixel-9',
    brand: 'google',
    screenInches: 6.3,
    releaseYear: 2024,
    status: 'comingSoon',
    sortOrder: 90,
  },
]
