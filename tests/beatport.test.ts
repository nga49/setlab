import { describe, expect, it } from 'vitest'
import { beatportSearchUrl, mainArtist, toBeatportQuery } from '../src/beatport'

describe('Beatport copy helper', () => {
  it('full = artist + title + remix, without feat., brackets and dashes', () => {
    expect(toBeatportQuery({ artist: 'Demo Artist 07 feat. Demo Singer', title: 'Demo Track K (Original Mix)', remix: null }, 'full')).toBe('Demo Artist 07 Demo Track K')
    expect(toBeatportQuery({ artist: 'Demo Artist 07', title: 'Demo Track K', remix: 'Demo Remix A' }, 'full')).toBe('Demo Artist 07 Demo Track K Demo Remix A')
    expect(toBeatportQuery({ artist: 'Demo Artist 07 - Live', title: '[Demo Track K]' }, 'full')).toBe('Demo Artist 07 Live Demo Track K')
  })
  it('short = main artist + title', () => {
    expect(toBeatportQuery({ artist: 'Demo Artist 07 & Demo Artist 08', title: 'Demo Track K ft. Demo Singer', remix: 'Demo Remix A' }, 'short')).toBe('Demo Artist 07 Demo Track K')
    expect(mainArtist('Demo Artist 07, Demo Artist 08')).toBe('Demo Artist 07')
    expect(mainArtist('Demo Artist 07 x Demo Artist 08')).toBe('Demo Artist 07')
  })
  it('search URL is encoded', () => {
    expect(beatportSearchUrl({ artist: 'Demo Artist 07', title: 'Demo Track K' })).toBe('https://www.beatport.com/search?q=Demo%20Artist%2007%20Demo%20Track%20K')
  })
})
