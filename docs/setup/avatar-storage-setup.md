# Avatar Storage Setup

This document explains how to set up Supabase Storage for user avatar images.

## Prerequisites

- Supabase project created
- Database migrations applied (including the avatar_url field)

## Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public**: ✅ Yes (so images can be accessed via URL)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/*`

### 2. Set Up RLS Policies

Create the following RLS policies for the `avatars` bucket:

#### Policy 1: Users can upload their own avatars
```sql
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: Users can view all avatars
```sql
CREATE POLICY "Users can view all avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
```

#### Policy 3: Users can update their own avatars
```sql
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Users can delete their own avatars
```sql
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Apply Database Migrations

Apply the following migrations in order:
1. `20250912124858_add_avatar_to_profiles.sql` - Adds avatar_url field to profiles table
2. `20250912130557_add_avatar_storage_policies.sql` - Creates RLS policies for avatars storage

### 4. Test the Setup

1. Start your Nuxt application
2. Navigate to `/account`
3. Try uploading an avatar image
4. Verify the image appears and the URL is stored in the database

## File Structure

The storage bucket will organize files as follows:
```
avatars/
├── {user-id}/
│   ├── {timestamp}.jpg
│   ├── {timestamp}.png
│   └── ...
└── ...
```

## Security Notes

- All avatars are publicly accessible via URL
- Users can only upload/update/delete their own avatars
- File size and type validation is handled in the application
- Consider implementing image optimization/compression for better performance

## Troubleshooting

### Common Issues

1. **403 Forbidden when uploading**: Check RLS policies are correctly applied
2. **Images not displaying**: Verify the bucket is set to public
3. **File size errors**: Check the bucket's file size limit configuration

### Verification Queries

Check if policies are applied:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

Check bucket configuration:
```sql
SELECT * FROM storage.buckets WHERE name = 'avatars';
```
