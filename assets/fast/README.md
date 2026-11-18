# Interactive showcase previews

Optimized presentation assets; original benchmark deliveries are unchanged. Preview GLBs retain geometry and skeletons, quantize attributes, resample animation at 30 fps and resize textures to WebP (maximum 1024 px). Gzip files are decompressed in the viewer; parsed assets are cached across carousel switches. Motion bounds are measured offline over 61 frames from both delivery and GT.

Animation scores match the archived November 13 Sol artifacts, not the latest leaderboard run: Ronin 55.507749; Sniper 24.251987; Titan 58.394248; DRAGO 22.047777.

The colored helmet is a textured identity reference from Khronos glTF Sample Assets, Models/SciFiHelmet (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SciFiHelmet). See HELMET-LICENSE.md. It is distinct from the untextured task input and the agent UV delivery. Base color and occlusion textures are retained; preview metalness/roughness are approximated.
