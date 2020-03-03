import { useState, useEffect } from "react"
import { useCamera } from '@ionic/react-hooks/camera'
import { useFilesystem, base64FromPath } from '@ionic/react-hooks/filesystem'
import { useStorage } from '@ionic/react-hooks/storage'
import { isPlatform } from '@ionic/react'
import { CameraResultType, CameraSource, CameraPhoto,
    Capacitor, FilesystemDirectory } from "@capacitor/core"

export interface Photo {
    filepath: string
    webviewPath?: string
    base64?: string
}

const PHOTO_STORAGE = "photos"

export function usePhotoGallery() {
    const { get, set } = useStorage()
    const { deleteFile, getUri, readFile, writeFile } = useFilesystem()
    const { getPhoto } = useCamera()
    const [photos, setPhotos] = useState<Photo[]>([])


    useEffect(() => {
        const loadSaved = async () => {
            const photosString = await get('photos')
            const photos = (photosString ? JSON.parse(photosString) : []) as Photo[]
            for (let photo of photos) {
                const file = await readFile({
                path: photo.filepath,
                directory: FilesystemDirectory.Data
                })
                photo.base64 = `data:image/jpeg;base64,${file.data}`
            }
            setPhotos(photos)
        }
        loadSaved()
    }, [get, readFile])
  
  
    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 100
        })
        const fileName = new Date().getTime() + '.jpeg'
        const savedFileImage = await savePicture(cameraPhoto, fileName)
        const newPhotos = [savedFileImage, ...photos]
        setPhotos(newPhotos)
        set(PHOTO_STORAGE, JSON.stringify(newPhotos.map(p => {
            const photoCopy = { ...p }
            delete photoCopy.base64
            return photoCopy
        })))  
    }
    const savePicture = async (photo: CameraPhoto, fileName: string) => {
        let base64Data: string
        if (isPlatform('hybrid')) {
            const file = await readFile({
                path: photo.path!
            })
            base64Data = file.data
        } else {
            base64Data = await base64FromPath(photo.webPath!)
        }
        await writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data
        })
        return getPhotoFile(photo, fileName)
    }
    const getPhotoFile = async (cameraPhoto: CameraPhoto, fileName: string): Promise<Photo> => {
        if (isPlatform('hybrid')) {
            const fileUri = await getUri({
                directory: FilesystemDirectory.Data,
                path: fileName
            })
            return {
                filepath: fileUri.uri,
                webviewPath: Capacitor.convertFileSrc(fileUri.uri),
            }
        } else {
            return {
                filepath: fileName,
                webviewPath: cameraPhoto.webPath
            }
        }
    }
    return {
        photos,
        takePhoto
    }
}
