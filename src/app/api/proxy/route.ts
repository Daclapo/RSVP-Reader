// src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status });
    }
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove script and style tags
    document.querySelectorAll('script, style').forEach(el => el.remove());

    let mainContentElement = document.querySelector('article') ||
                             document.querySelector('main') ||
                             document.querySelector('[role="main"]') ||
                             document.querySelector('#content') ||
                             document.querySelector('.main-content') ||
                             document.body;

    let text = mainContentElement.textContent || "";

    // Clean up multiple spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Proxy fetching error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
