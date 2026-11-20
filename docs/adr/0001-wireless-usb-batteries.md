# ADR 0001: Bateria de periféricos sem fio com dongle USB

**Data:** 20/11/2026 · **Status:** aceito

## Contexto
O Windows mostra a bateria de aparelhos Bluetooth, mas não a de fones e mouses 2.4 GHz com dongle USB. Cada fabricante usa um protocolo HID próprio, sem padrão.

## Decisão
Criar `ekko-os::peripherals`, com **um driver por fabricante** sobre uma camada HID fina (`hid.rs`). Só abrimos dispositivos dos fabricantes conhecidos, sem acesso exclusivo, para não brigar com o software oficial.
- **HyperX Cloud Stinger Core Wireless** (`0951:170B`): pergunta por feature report `0xFF` e espera a resposta com o cabeçalho certo (chega em 30 a 50 ms). O percentual vem da tensão, por uma curva genérica de Li-ion, então é aproximado.
- **Attack Shark** (dongle `1D57:FA60`): só escuta, porque o dongle manda `03 MM 40 ST NN` a cada ~2 s. O X3 e o X6 usam a escala de 0 a 10, enquanto os outros usam 0 a 100. Um quadro só vale quando chega igual duas vezes, porque cada reconexão manda um "100%" falso.

Os aparelhos entram em `PowerSnapshot.devices` junto com os Bluetooth, e assim o card Bateria e os avisos de 15/10/5% funcionam sem mudar a UI. O campo `charging` evita aviso de bateria fraca no cabo.

## Consequências
- Um aparelho novo pede um arquivo de driver e uma linha em `scan`. Os protocolos vêm da comunidade (HyperBatteryMonitor, nogenuity, attackshark-battery-windows, mouse-battery-tray) e são conferidos no aparelho real.
- Ainda não cobre o caso genérico de HID com *Battery Strength* (página 0x06). Fica para quando houver um aparelho para testar.
