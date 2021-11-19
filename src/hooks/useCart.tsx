import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem("@RocketShoes:cart");

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    async function stockVerifyEmpty(productId: number, productAmount: number) {
        const stock = await api.get(`stock/${productId}`);
        return stock.data.amount < productAmount
    }

    const addProduct = async (productId: number) => {
        try {
            for (let prod of cart) {
                if (productId === prod.id) {
                    const notAvaliable = await stockVerifyEmpty(productId, prod.amount)
                    if (notAvaliable) {
                        toast.error("Quantidade solicitada fora de estoque");
                        return;
                    }
                    updateProductAmount({
                        productId: prod.id,
                        amount: prod.amount + 1,
                    });
                    return;
                }
            }
            const notAvaliable = await stockVerifyEmpty(productId, 1)
            if (notAvaliable) {
                toast.error("Quantidade solicitada fora de estoque");
                return;
            }
            api.get(`products/${productId}`).then((product) => {
                const newProduct = {
                    ...product.data,
                    amount: 1,
                };
                const newCart = [...cart, newProduct];
                setCart(newCart);
                localStorage.setItem(
                    "@RocketShoes:cart",
                    JSON.stringify(newCart)
                );
            });
        } catch {
            toast.error("Erro na adição do produto");
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const productToRemove = cart.find(
                (product) => product.id === productId
            );
            if (!productToRemove) {
                throw new Error();
            }
            const result = cart.filter((product) => product.id !== productId);
            setCart([...result]);
            localStorage.setItem("@RocketShoes:cart", JSON.stringify(result));
        } catch {
            toast.error("Erro na remoção do produto");
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            if (amount <= 0) {
                return;
            }
            const stock = await api.get(`stock/${productId}`);
            if (amount > stock.data.amount) {
                toast.error("Quantidade solicitada fora de estoque");
                return;
            }
            for (let prod of cart) {
                if (prod.id === productId) {
                    prod.amount = amount;
                }
            }
            const newCart = [...cart];
            setCart(newCart);
            localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        } catch {
            toast.error("Erro na alteração de quantidade do produto");
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
