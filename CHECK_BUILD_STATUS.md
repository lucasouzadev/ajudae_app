# Como Acompanhar o EAS Build

O build foi iniciado via EAS. Aqui estão as formas de acompanhar:

---

## 🖥️ Opção 1: Dashboard EAS (Recomendado)

Acesse: https://expo.dev/accounts/juiceluqi/projects/ajuda

Você verá:
- Status do build em tempo real
- Progresso (0-100%)
- Quando completar, link para download .apk

---

## 🖥️ Opção 2: Linha de Comando

Se o terminal original ainda estiver rodando:

```bash
cd artifacts/fretex
eas build --platform android --profile development
```

Vai mostrar quando completar:
```
✔ Build finished
Build URL: https://expo.dev/accounts/...
```

---

## 📥 Quando o Build Terminar

Você verá um **link de download** do `.apk`. Copie e abra no seu Android phone para instalar.

---

## ⏱️ Tempo Estimado

| Passo | Tempo |
|-------|-------|
| Inicializar | 1-2 min |
| Compilar código | 10-15 min |
| Gerar APK | 2-3 min |
| **Total** | **15-20 min** |

---

## ✅ Quando Estiver Pronto

1. Copie o link do `.apk`
2. Abra no seu Android phone
3. Instale o Dev Client
4. Siga as instruções em `NEXT_STEPS_GOOGLE_MAPS.md`

---

_Verificar status em tempo real: https://expo.dev/accounts/juiceluqi/projects/ajuda_
