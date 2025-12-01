import { Image, File } from 'lucide-react';

interface CopyOptionsProps {
  copyMedia: boolean;
  onCopyMediaChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CopyOptions({ copyMedia, onCopyMediaChange, disabled }: CopyOptionsProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium mb-3">Opções de Cópia</label>

      <div className="bg-card border rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={copyMedia}
            onChange={(e) => onCopyMediaChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Image className="h-4 w-4 text-primary" />
              <span className="font-medium">Copiar arquivos de mídia</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Incluir fotos, vídeos, documentos e outros arquivos nas mensagens copiadas
            </p>

            {/* Info Box */}
            <div className="mt-3 p-3 bg-muted/50 rounded-md">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <File className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p>
                    <strong>Tipos suportados:</strong> Fotos, vídeos, áudios, documentos, stickers
                  </p>
                  <p>
                    <strong>Nota:</strong> A cópia de arquivos grandes pode levar mais tempo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
