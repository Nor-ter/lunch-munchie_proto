export interface User {
  id: string;
  username: string;
  profile_image_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}
