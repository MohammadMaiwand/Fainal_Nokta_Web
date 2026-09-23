import { withSignedProfileImage, stripUploadSignature, verifyUploadSignature, signUploadPath } from '../utils/signedUploadUrl';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const pathName = '/uploads/profiles/demo.jpg';
const signed = signUploadPath(pathName, 60);
const url = new URL(signed, 'http://localhost');
assert(verifyUploadSignature(pathName, url.searchParams.get('exp') ?? undefined, url.searchParams.get('sig') ?? undefined), 'signature should verify');
assert(stripUploadSignature(signed) === pathName, 'strip should remove query');
assert(withSignedProfileImage(pathName).startsWith(`${pathName}?`), 'profile image should be signed');
assert(withSignedProfileImage('') === '', 'empty profile image stays empty');
assert(!verifyUploadSignature(pathName, '1', 'bad'), 'invalid signature rejected');

console.log('signedUploadUrl tests passed');
