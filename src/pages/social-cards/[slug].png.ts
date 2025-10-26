import siteConfig from '~/site.config'
import { Resvg } from '@resvg/resvg-js'
import type { APIContext, InferGetStaticPropsType } from 'astro'
import satori, { type SatoriOptions } from 'satori'
import { html } from 'satori-html'
import { dateString, getSortedPosts, resolveThemeColorStyles } from '~/utils'
import path from 'path'
import fs from 'fs'
import type { ReactNode } from 'react'

// Load the font file as binary data
const fontPath = path.resolve(
  './node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf',
)
const fontData = fs.readFileSync(fontPath) // Reads the file as a Buffer

const avatarPath = path.resolve(siteConfig.socialCardAvatarImage)
let avatarData: Buffer | undefined
let avatarBase64: string | undefined
if (
  fs.existsSync(avatarPath) &&
  (path.extname(avatarPath).toLowerCase() === '.jpg' ||
    path.extname(avatarPath).toLowerCase() === '.jpeg')
) {
  avatarData = fs.readFileSync(avatarPath)
  avatarBase64 = `data:image/jpeg;base64,${avatarData.toString('base64')}`
}

const defaultTheme =
  siteConfig.themes.default === 'auto'
    ? siteConfig.themes.include[0]
    : siteConfig.themes.default

let bg: string | undefined
let fg: string | undefined
let accent: string | undefined

try {
  const themeStyles = await resolveThemeColorStyles(
    [defaultTheme],
    siteConfig.themes.overrides,
  )
  bg = themeStyles[defaultTheme]?.background
  fg = themeStyles[defaultTheme]?.foreground
  accent = themeStyles[defaultTheme]?.accent
} catch (error) {
  console.warn(`Failed to resolve theme colors for ${defaultTheme}:`, error)
  // Fallback colors will be used in markup function
}

const ogOptions: SatoriOptions = {
  // debug: true,
  fonts: [
    {
      data: fontData,
      name: 'JetBrains Mono',
      style: 'normal',
      weight: 400,
    },
  ],
  height: 630,
  width: 1200,
}

const markup = (title: string, pubDate: string | undefined, author: string) => {
  // Ensure we have fallback colors if theme resolution fails
  const safeBg = bg || '#1a1a1a'
  const safeFg = fg || '#ffffff'
  const safeAccent = accent || '#3b82f6'

  // Build the HTML structure step by step to avoid template literal issues
  let content = `<div style="display: flex; flex-direction: column; max-width: 100%; justify-content: center; height: 100%; background-color: ${safeBg}; color: ${safeFg}; padding: 48px;">`

  content += `<div style="border-width: 12px; border-radius: 80px; display: flex; align-items: center; max-width: 100%; padding: 32px; border-color: ${safeAccent}33;">`

  if (avatarBase64) {
    content += `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 33.33%; height: 100%;">`
    content += `<img src="${avatarBase64}" style="display: flex; width: 100%; border-radius: 50%; border-color: ${safeAccent}33; border-width: 2px;" />`
    content += `</div>`
  }

  content += `<div style="display: flex; flex: 1; flex-direction: column; max-width: 100%; justify-content: center; align-items: center;">`

  if (pubDate) {
    content += `<p style="font-size: 48px; max-width: 100%; color: ${safeAccent}; margin: 0;">${pubDate}</p>`
  }

  content += `<h1 style="font-size: 96px; margin: 56px 0; text-align: center; line-height: 1.2;">${title}</h1>`

  if (author !== title) {
    content += `<p style="font-size: 64px; color: ${safeAccent}; margin: 0;">${author}</p>`
  }

  content += `</div></div></div>`

  return html(content)
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>

export async function GET(context: APIContext) {
  const { pubDate, title, author } = context.props as Props

  try {
    const svg = await satori(markup(title, pubDate, author) as ReactNode, ogOptions)
    const png = new Resvg(svg).render().asPng()
    return new Response(new Uint8Array(png), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    console.error('Failed to generate social card:', error)
    // Return a minimal 1x1 transparent PNG as fallback
    const fallbackPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC6, 0x2F, 0x73, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    return new Response(fallbackPng, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    })
  }
}

export async function getStaticPaths() {
  const posts = await getSortedPosts()
  return posts
    .map((post) => ({
      params: { slug: post.id },
      props: {
        pubDate: post.data.published ? dateString(post.data.published) : undefined,
        title: post.data.title,
        author: post.data.author || siteConfig.author,
      },
    }))
    .concat([
      {
        params: { slug: '__default' },
        props: { pubDate: undefined, title: siteConfig.title, author: siteConfig.author },
      },
    ])
}
