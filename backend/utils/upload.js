const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'twospace', resource_type: 'image' },
        (err, result) => {
          if (err || !result || !result.secure_url) {
            reject(new Error('UPLOAD_FAILED'));
            return;
          }
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    } catch (err) {
      reject(new Error('UPLOAD_FAILED'));
    }
  });

module.exports = { uploadToCloudinary };

