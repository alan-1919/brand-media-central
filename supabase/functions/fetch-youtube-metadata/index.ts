import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideoMetadata {
  videoId: string;
  title: string | null;
  publishDate: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number | null;
}

function parseDuration(duration: string): number | null {
  // Parse ISO 8601 duration format (e.g., PT4M13S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoIds } = await req.json();
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'videoIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch video details from YouTube Data API
    const idsParam = videoIds.join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${idsParam}&key=${apiKey}`;
    
    console.log(`Fetching metadata for ${videoIds.length} videos`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'YouTube API error' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: YouTubeVideoMetadata[] = videoIds.map((videoId: string) => {
      const item = data.items?.find((i: any) => i.id === videoId);
      
      if (!item) {
        return {
          videoId,
          title: null,
          publishDate: null,
          channelName: null,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: null,
          viewCount: null,
        };
      }

      const snippet = item.snippet;
      const contentDetails = item.contentDetails;
      const statistics = item.statistics;

      return {
        videoId,
        title: snippet?.title || null,
        publishDate: snippet?.publishedAt ? snippet.publishedAt.split('T')[0] : null,
        channelName: snippet?.channelTitle || null,
        thumbnailUrl: snippet?.thumbnails?.maxres?.url || 
                      snippet?.thumbnails?.high?.url || 
                      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: contentDetails?.duration ? parseDuration(contentDetails.duration) : null,
        viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : null,
      };
    });

    console.log(`Successfully fetched metadata for ${results.length} videos`);

    return new Response(
      JSON.stringify({ videos: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
