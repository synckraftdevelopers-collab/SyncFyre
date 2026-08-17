-- Member avatars are rendered with public Storage URLs. The bucket was
-- initially created as private, causing those URLs to return HTTP 400.
update storage.buckets
set public = true
where id = 'member-photos';