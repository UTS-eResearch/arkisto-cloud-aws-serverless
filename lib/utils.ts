import * as path from 'path';
import * as fs from 'fs';

export default class Utils {
  public resolveAsset(location: string): any {
    try {
      if (path.isAbsolute(location)) {
        if (fs.existsSync(location)) {
          return location;
        }
      } else {
        return path.resolve(process.cwd(), location);
      }
    } catch (err) {
      console.error(`check location == ${location} == it should be relative to this folder or absolute`);
      throw new Error(err);
    }
  }
}
