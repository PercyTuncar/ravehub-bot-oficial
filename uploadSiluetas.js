const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configura Cloudinary con tus credenciales
// Asegúrate de que las variables de entorno estén configuradas
cloudinary.config({
  cloud_name: 'amadodedios',
  api_key: '986222159133392',
  api_secret: 'MkaOuYDz0OoVrLs8jcMq1CXR79k',
});

const djsDirectory = path.join(__dirname, 'Djs-images');
const siluetasFile = path.join(__dirname, 'games', 'silueta', 'siluetas.json');

/**
 * Finds a file in a directory with a case-insensitive search.
 * @param {string} dirPath The directory to search in.
 * @param {string} searchString The string to search for in the filename.
 * @param {boolean} exactMatch If true, looks for an exact filename match (case-insensitive).
 * @returns {string|null} The found filename or null.
 */
function findFile(dirPath, searchString, exactMatch = false) {
    const files = fs.readdirSync(dirPath);
    const lowerCaseSearch = searchString.toLowerCase();
    for (const file of files) {
        const lowerCaseFile = file.toLowerCase();
        const fileNameWithoutExt = path.parse(lowerCaseFile).name;

        if (exactMatch) {
            // Exact match for regular DJ images
            if (fileNameWithoutExt === lowerCaseSearch) {
                return file;
            }
        } else {
            // Starts-with match for silhouettes
            if (lowerCaseFile.startsWith(lowerCaseSearch)) {
                return file;
            }
        }
    }
    return null;
}


async function uploadDjImages() {
  try {
    const siluetasData = JSON.parse(fs.readFileSync(siluetasFile, 'utf8'));

    for (const dj of siluetasData) {
      const djName = dj.name;
      console.log(`Processing DJ: ${djName}`);

      // --- Upload Silhouette Image ---
      const silhouetteSearchString = `silueta ${djName}`;
      const silhouetteFileName = findFile(djsDirectory, silhouetteSearchString);

      if (silhouetteFileName) {
        const silhouettePath = path.join(djsDirectory, silhouetteFileName);
        const silhouetteResult = await cloudinary.uploader.upload(silhouettePath, {
          folder: 'djs_siluetas',
          public_id: `silueta_${djName.toLowerCase().replace(/ /g, '_')}`,
          overwrite: true
        });
        dj.silhouetteUrl = silhouetteResult.secure_url;
        console.log(`  -> Uploaded silhouette: ${silhouetteResult.secure_url}`);
      } else {
        console.log(`  -> Silhouette for "${djName}" not found.`);
      }

      // --- Upload Regular DJ Image ---
      const imageFileName = findFile(djsDirectory, djName, true);
      if (imageFileName) {
        const imagePath = path.join(djsDirectory, imageFileName);
        const imageResult = await cloudinary.uploader.upload(imagePath, {
          folder: 'djs_images',
          public_id: `${djName.toLowerCase().replace(/ /g, '_')}`,
          overwrite: true
        });
        dj.imageUrl = imageResult.secure_url;
        console.log(`  -> Uploaded image: ${imageResult.secure_url}`);
      } else {
        console.log(`  -> Image for "${djName}" not found.`);
      }
    }

    fs.writeFileSync(siluetasFile, JSON.stringify(siluetasData, null, 2));
    console.log('\nsiluetas.json has been updated with new Cloudinary URLs.');

  } catch (error) {
    console.error('Error uploading DJ images:', error);
  }
}

uploadDjImages();
