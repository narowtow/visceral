import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export const MODEL_URL = `${import.meta.env.BASE_URL}models/visceral.glb`

// Use the same loader/decoder implementation in the scene and the Node regression
// test, rather than drei's separate three-stdlib GLTFLoader implementation.
export function configureModelLoader(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder)
  return loader
}
