#!/usr/bin/env python
import time
fp = open("calculator.appcache")
out = []
for line in fp.readlines():
    if line.startswith("# date: "):
        line = "# date: %s\n" % time.asctime()
    out.append(line)
fp.close()
fp = open("calculator.appcache", "w")
fp.write("".join(out))
fp.close()

