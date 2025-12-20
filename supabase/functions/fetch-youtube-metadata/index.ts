import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Request rejected: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log('Request rejected: Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has editor or admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'editor' });
    
    const { data: adminRoleData } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || (!roleData && !adminRoleData)) {
      console.log(`Request rejected: User ${user.id} lacks required role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Editor or Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated request from user ${user.id}`);

    const { videoIds } = await req.json();
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'videoIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate videoIds format (basic sanitization)
    const validVideoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    const invalidIds = videoIds.filter((id: string) => !validVideoIdPattern.test(id));
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid video ID format detected' }),
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
