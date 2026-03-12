export const STORAGE_CONFIG = {
    BUCKET_NAME: 'videos',
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500 Mo
    ALLOWED_TYPES: [
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ],
    ALLOWED_EXTENSIONS: ['.mp4', '.webm', '.mov'],
    THUMBNAIL_SIZE: {
        width: 320,
        height: 180
    }
};