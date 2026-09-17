/** The decoder object is passed opaquely to glTF Transform, which owns its API. */
declare module 'draco3dgltf' {
 const draco: { createDecoderModule(options?: Record<string, unknown>): Promise<unknown> };
 export default draco;
}
