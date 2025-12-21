// server/api/verify-recaptcha.post.ts
import {useRuntimeConfig} from '#imports';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const {token} = await readBody(event);

    if (!token) {
        throw createError({statusCode: 400, statusMessage: 'Token missing'});
    }

    const secretKey = config.private.recaptchaSecretKey;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    const response = await $fetch(verificationUrl, {method: 'POST'});

    if (response.success) {
        return {success: true, score: response.score}; // v3 returns a score
    } else {
        throw createError({statusCode: 400, statusMessage: 'reCAPTCHA verification failed'});
    }
});
