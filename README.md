## Commands

```sh
ffmpeg -i input.m4a \
  -ac 1 \
  -c:a aac \
  -b:a 96k \
  output.m4a

# 無音を削除
ffmpeg -i input.m4a \
  -af silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB \
  output.m4a
```
