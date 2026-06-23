using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Scripts_ {

    public class Scroll_Script : MonoBehaviour {
        [SerializeField] private List<Sprite> spriteList;
        [SerializeField] private GameObject panel_B_;
        public GameObject prefabImage;

        void Start() {
            foreach (Sprite sprite in spriteList) {
                GameObject newObject = Instantiate(prefabImage, panel_B_.transform);
                newObject.SetActive(true);
                Image newImage = newObject.GetComponent<Image>();

                // Asigna el sprite como imagen en el componente Image
                newImage.sprite = sprite;
            }
        }
    }
}